import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator as CalculatorIcon, Lock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBlockedStatus } from "@/hooks/useBlockedStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Calculator() {
  const { isBlocked, loading } = useBlockedStatus();
  
  // IMC Calculator State
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [imc, setImc] = useState<number | null>(null);

  // Calories Calculator State
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState<"hombre" | "mujer">("hombre");
  const [pesoCalories, setPesoCalories] = useState("");
  const [alturaCalories, setAlturaCalories] = useState("");
  const [actividad, setActividad] = useState("sedentario");
  const [calorias, setCalorias] = useState<number | null>(null);

  const calcularIMC = () => {
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura) / 100; // Convert cm to m

    if (pesoNum > 0 && alturaNum > 0) {
      const imcCalculado = pesoNum / (alturaNum * alturaNum);
      setImc(parseFloat(imcCalculado.toFixed(2)));
    }
  };

  const getIMCCategory = (imc: number) => {
    if (imc < 18.5) return { text: "Bajo peso", color: "text-blue-500" };
    if (imc < 25) return { text: "Peso normal", color: "text-green-500" };
    if (imc < 30) return { text: "Sobrepeso", color: "text-yellow-500" };
    return { text: "Obesidad", color: "text-red-500" };
  };

  const calcularCalorias = () => {
    const pesoNum = parseFloat(pesoCalories);
    const alturaNum = parseFloat(alturaCalories);
    const edadNum = parseInt(edad);

    if (pesoNum > 0 && alturaNum > 0 && edadNum > 0) {
      // Fórmula de Harris-Benedict
      let tmb;
      if (sexo === "hombre") {
        tmb = 88.362 + (13.397 * pesoNum) + (4.799 * alturaNum) - (5.677 * edadNum);
      } else {
        tmb = 447.593 + (9.247 * pesoNum) + (3.098 * alturaNum) - (4.330 * edadNum);
      }

      // Factor de actividad
      const factoresActividad: { [key: string]: number } = {
        sedentario: 1.2,
        ligero: 1.375,
        moderado: 1.55,
        activo: 1.725,
        muyActivo: 1.9,
      };

      const caloriasCalculadas = tmb * factoresActividad[actividad];
      setCalorias(Math.round(caloriasCalculadas));
    }
  };

  if (isBlocked) {
    return (
      <div className="container max-w-4xl py-4 md:py-8 px-4">
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <Lock className="h-4 w-4" />
          <AlertTitle>Cuenta bloqueada</AlertTitle>
          <AlertDescription>
            Tu cuenta ha sido bloqueada por el administrador. No puedes acceder a esta funcionalidad. 
            Por favor, contacta con el gimnasio para más información.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-4 md:py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="font-bebas text-5xl md:text-6xl lg:text-7xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]">
          CALCULADORAS FITNESS
        </h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">
          Herramientas para ayudarte a alcanzar tus objetivos
        </p>
      </div>

      <Tabs defaultValue="imc" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="imc">Calculadora IMC</TabsTrigger>
          <TabsTrigger value="calorias">Calculadora de Calorías</TabsTrigger>
        </TabsList>

        <TabsContent value="imc">
          <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <CardHeader className="text-center">
              <CardTitle className="font-bebas text-3xl md:text-4xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                ÍNDICE DE MASA CORPORAL
              </CardTitle>
              <CardDescription className="text-base">
                Calcula tu IMC para conocer tu estado de peso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="peso-imc">Peso (kg)</Label>
                <Input
                  id="peso-imc"
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="70.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altura-imc">Altura (cm)</Label>
                <Input
                  id="altura-imc"
                  type="number"
                  step="0.1"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  placeholder="175"
                />
              </div>

              <Button 
                onClick={calcularIMC} 
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <CalculatorIcon className="mr-2 h-4 w-4" />
                Calcular IMC
              </Button>

              {imc !== null && (
                <div className="mt-6 p-6 bg-background/50 rounded-lg border border-primary/20 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Tu IMC es:</p>
                  <p className="text-4xl font-bold text-primary">{imc}</p>
                  <p className={`text-lg font-semibold ${getIMCCategory(imc).color}`}>
                    {getIMCCategory(imc).text}
                  </p>
                  <div className="mt-4 text-sm text-muted-foreground space-y-1">
                    <p>Bajo peso: &lt; 18.5</p>
                    <p>Peso normal: 18.5 - 24.9</p>
                    <p>Sobrepeso: 25 - 29.9</p>
                    <p>Obesidad: ≥ 30</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calorias">
          <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <CardHeader className="text-center">
              <CardTitle className="font-bebas text-3xl md:text-4xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                CALCULADORA DE CALORÍAS
              </CardTitle>
              <CardDescription className="text-base">
                Calcula tus calorías diarias recomendadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sexo</Label>
                <RadioGroup value={sexo} onValueChange={(value) => setSexo(value as "hombre" | "mujer")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hombre" id="hombre" />
                    <Label htmlFor="hombre" className="cursor-pointer">Hombre</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mujer" id="mujer" />
                    <Label htmlFor="mujer" className="cursor-pointer">Mujer</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edad">Edad (años)</Label>
                <Input
                  id="edad"
                  type="number"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  placeholder="25"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peso-calorias">Peso (kg)</Label>
                <Input
                  id="peso-calorias"
                  type="number"
                  step="0.1"
                  value={pesoCalories}
                  onChange={(e) => setPesoCalories(e.target.value)}
                  placeholder="70.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altura-calorias">Altura (cm)</Label>
                <Input
                  id="altura-calorias"
                  type="number"
                  step="0.1"
                  value={alturaCalories}
                  onChange={(e) => setAlturaCalories(e.target.value)}
                  placeholder="175"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actividad">Nivel de actividad</Label>
                <Select value={actividad} onValueChange={setActividad}>
                  <SelectTrigger id="actividad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentario">Sedentario (poco o ningún ejercicio)</SelectItem>
                    <SelectItem value="ligero">Ligero (ejercicio 1-3 días/semana)</SelectItem>
                    <SelectItem value="moderado">Moderado (ejercicio 3-5 días/semana)</SelectItem>
                    <SelectItem value="activo">Activo (ejercicio 6-7 días/semana)</SelectItem>
                    <SelectItem value="muyActivo">Muy activo (ejercicio 2 veces al día)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={calcularCalorias} 
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <CalculatorIcon className="mr-2 h-4 w-4" />
                Calcular Calorías
              </Button>

              {calorias !== null && (
                <div className="mt-6 p-6 bg-background/50 rounded-lg border border-primary/20 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Tus calorías diarias recomendadas son:</p>
                  <p className="text-4xl font-bold text-primary">{calorias}</p>
                  <p className="text-lg text-muted-foreground">kcal/día</p>
                  <div className="mt-4 text-sm text-muted-foreground space-y-1 text-left">
                    <p className="font-semibold">Recomendaciones según tu objetivo:</p>
                    <p>• Perder peso: {Math.round(calorias * 0.85)} kcal/día</p>
                    <p>• Mantener peso: {calorias} kcal/día</p>
                    <p>• Ganar músculo: {Math.round(calorias * 1.15)} kcal/día</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
